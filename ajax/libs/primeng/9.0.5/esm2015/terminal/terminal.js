var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { NgModule, Component, AfterViewInit, AfterViewChecked, OnDestroy, Input, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomHandler } from 'primeng/dom';
import { TerminalService } from './terminalservice';
let Terminal = class Terminal {
    constructor(el, terminalService) {
        this.el = el;
        this.terminalService = terminalService;
        this.commands = [];
        this.subscription = terminalService.responseHandler.subscribe(response => {
            this.commands[this.commands.length - 1].response = response;
            this.commandProcessed = true;
        });
    }
    ngAfterViewInit() {
        this.container = DomHandler.find(this.el.nativeElement, '.ui-terminal')[0];
    }
    ngAfterViewChecked() {
        if (this.commandProcessed) {
            this.container.scrollTop = this.container.scrollHeight;
            this.commandProcessed = false;
        }
    }
    set response(value) {
        if (value) {
            this.commands[this.commands.length - 1].response = value;
            this.commandProcessed = true;
        }
    }
    handleCommand(event) {
        if (event.keyCode == 13) {
            this.commands.push({ text: this.command });
            this.terminalService.sendCommand(this.command);
            this.command = '';
        }
    }
    focus(element) {
        element.focus();
    }
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
};
Terminal.ctorParameters = () => [
    { type: ElementRef },
    { type: TerminalService }
];
__decorate([
    Input()
], Terminal.prototype, "welcomeMessage", void 0);
__decorate([
    Input()
], Terminal.prototype, "prompt", void 0);
__decorate([
    Input()
], Terminal.prototype, "style", void 0);
__decorate([
    Input()
], Terminal.prototype, "styleClass", void 0);
__decorate([
    Input()
], Terminal.prototype, "response", null);
Terminal = __decorate([
    Component({
        selector: 'p-terminal',
        template: `
        <div [ngClass]="'ui-terminal ui-widget ui-widget-content ui-corner-all'" [ngStyle]="style" [class]="styleClass" (click)="focus(in)">
            <div *ngIf="welcomeMessage">{{welcomeMessage}}</div>
            <div class="ui-terminal-content">
                <div *ngFor="let command of commands">
                    <span>{{prompt}}</span>
                    <span class="ui-terminal-command">{{command.text}}</span>
                    <div>{{command.response}}</div>
                </div>
            </div>
            <div>
                <span class="ui-terminal-content-prompt">{{prompt}}</span>
                <input #in type="text" [(ngModel)]="command" class="ui-terminal-input" autocomplete="off" (keydown)="handleCommand($event)" autofocus>
            </div>
        </div>
    `,
        changeDetection: ChangeDetectionStrategy.Default
    })
], Terminal);
export { Terminal };
let TerminalModule = class TerminalModule {
};
TerminalModule = __decorate([
    NgModule({
        imports: [CommonModule, FormsModule],
        exports: [Terminal],
        declarations: [Terminal]
    })
], TerminalModule);
export { TerminalModule };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9wcmltZW5nL3Rlcm1pbmFsLyIsInNvdXJjZXMiOlsidGVybWluYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsT0FBTyxFQUFDLFFBQVEsRUFBQyxTQUFTLEVBQUMsYUFBYSxFQUFDLGdCQUFnQixFQUFDLFNBQVMsRUFBQyxLQUFLLEVBQUMsVUFBVSxFQUFDLHVCQUF1QixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ25JLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUN2QyxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUF1QmxELElBQWEsUUFBUSxHQUFyQixNQUFhLFFBQVE7SUFvQmpCLFlBQW1CLEVBQWMsRUFBUyxlQUFnQztRQUF2RCxPQUFFLEdBQUYsRUFBRSxDQUFZO1FBQVMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBVjFFLGFBQVEsR0FBVSxFQUFFLENBQUM7UUFXakIsSUFBSSxDQUFDLFlBQVksR0FBRyxlQUFlLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNyRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7WUFDNUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCxlQUFlO1FBQ1gsSUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9FLENBQUM7SUFFRCxrQkFBa0I7UUFDZCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQztZQUN2RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1NBQ2pDO0lBQ0wsQ0FBQztJQUdELElBQUksUUFBUSxDQUFDLEtBQWE7UUFDdEIsSUFBSSxLQUFLLEVBQUU7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7WUFDekQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztTQUNoQztJQUNMLENBQUM7SUFFRCxhQUFhLENBQUMsS0FBb0I7UUFDOUIsSUFBSSxLQUFLLENBQUMsT0FBTyxJQUFJLEVBQUUsRUFBRTtZQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7U0FDckI7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQW9CO1FBQ3RCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBRUQsV0FBVztRQUNQLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDO1NBQ25DO0lBQ0wsQ0FBQztDQUVKLENBQUE7O1lBNUMwQixVQUFVO1lBQTBCLGVBQWU7O0FBbEJqRTtJQUFSLEtBQUssRUFBRTtnREFBd0I7QUFFdkI7SUFBUixLQUFLLEVBQUU7d0NBQWdCO0FBRWY7SUFBUixLQUFLLEVBQUU7dUNBQVk7QUFFWDtJQUFSLEtBQUssRUFBRTs0Q0FBb0I7QUErQjVCO0lBREMsS0FBSyxFQUFFO3dDQU1QO0FBNUNRLFFBQVE7SUFwQnBCLFNBQVMsQ0FBQztRQUNQLFFBQVEsRUFBRSxZQUFZO1FBQ3RCLFFBQVEsRUFBRTs7Ozs7Ozs7Ozs7Ozs7O0tBZVQ7UUFDRCxlQUFlLEVBQUUsdUJBQXVCLENBQUMsT0FBTztLQUNuRCxDQUFDO0dBQ1csUUFBUSxDQWdFcEI7U0FoRVksUUFBUTtBQXVFckIsSUFBYSxjQUFjLEdBQTNCLE1BQWEsY0FBYztDQUFJLENBQUE7QUFBbEIsY0FBYztJQUwxQixRQUFRLENBQUM7UUFDTixPQUFPLEVBQUUsQ0FBQyxZQUFZLEVBQUMsV0FBVyxDQUFDO1FBQ25DLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQztRQUNuQixZQUFZLEVBQUUsQ0FBQyxRQUFRLENBQUM7S0FDM0IsQ0FBQztHQUNXLGNBQWMsQ0FBSTtTQUFsQixjQUFjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtOZ01vZHVsZSxDb21wb25lbnQsQWZ0ZXJWaWV3SW5pdCxBZnRlclZpZXdDaGVja2VkLE9uRGVzdHJveSxJbnB1dCxFbGVtZW50UmVmLENoYW5nZURldGVjdGlvblN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Rm9ybXNNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJztcbmltcG9ydCB7Q29tbW9uTW9kdWxlfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtEb21IYW5kbGVyfSBmcm9tICdwcmltZW5nL2RvbSc7XG5pbXBvcnQge1Rlcm1pbmFsU2VydmljZX0gZnJvbSAnLi90ZXJtaW5hbHNlcnZpY2UnO1xuaW1wb3J0IHtTdWJzY3JpcHRpb259ICAgZnJvbSAncnhqcyc7XG5cbkBDb21wb25lbnQoe1xuICAgIHNlbGVjdG9yOiAncC10ZXJtaW5hbCcsXG4gICAgdGVtcGxhdGU6IGBcbiAgICAgICAgPGRpdiBbbmdDbGFzc109XCIndWktdGVybWluYWwgdWktd2lkZ2V0IHVpLXdpZGdldC1jb250ZW50IHVpLWNvcm5lci1hbGwnXCIgW25nU3R5bGVdPVwic3R5bGVcIiBbY2xhc3NdPVwic3R5bGVDbGFzc1wiIChjbGljayk9XCJmb2N1cyhpbilcIj5cbiAgICAgICAgICAgIDxkaXYgKm5nSWY9XCJ3ZWxjb21lTWVzc2FnZVwiPnt7d2VsY29tZU1lc3NhZ2V9fTwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpLXRlcm1pbmFsLWNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2ICpuZ0Zvcj1cImxldCBjb21tYW5kIG9mIGNvbW1hbmRzXCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPnt7cHJvbXB0fX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidWktdGVybWluYWwtY29tbWFuZFwiPnt7Y29tbWFuZC50ZXh0fX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxkaXY+e3tjb21tYW5kLnJlc3BvbnNlfX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInVpLXRlcm1pbmFsLWNvbnRlbnQtcHJvbXB0XCI+e3twcm9tcHR9fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgI2luIHR5cGU9XCJ0ZXh0XCIgWyhuZ01vZGVsKV09XCJjb21tYW5kXCIgY2xhc3M9XCJ1aS10ZXJtaW5hbC1pbnB1dFwiIGF1dG9jb21wbGV0ZT1cIm9mZlwiIChrZXlkb3duKT1cImhhbmRsZUNvbW1hbmQoJGV2ZW50KVwiIGF1dG9mb2N1cz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICBgLFxuICAgIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuRGVmYXVsdFxufSlcbmV4cG9ydCBjbGFzcyBUZXJtaW5hbCBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsQWZ0ZXJWaWV3Q2hlY2tlZCxPbkRlc3Ryb3kge1xuXG4gICAgQElucHV0KCkgd2VsY29tZU1lc3NhZ2U6IHN0cmluZztcblxuICAgIEBJbnB1dCgpIHByb21wdDogc3RyaW5nO1xuICAgICAgICBcbiAgICBASW5wdXQoKSBzdHlsZTogYW55O1xuICAgICAgICBcbiAgICBASW5wdXQoKSBzdHlsZUNsYXNzOiBzdHJpbmc7XG4gICAgICAgICAgICBcbiAgICBjb21tYW5kczogYW55W10gPSBbXTtcbiAgICBcbiAgICBjb21tYW5kOiBzdHJpbmc7XG4gICAgXG4gICAgY29udGFpbmVyOiBFbGVtZW50O1xuICAgIFxuICAgIGNvbW1hbmRQcm9jZXNzZWQ6IGJvb2xlYW47XG4gICAgXG4gICAgc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb247XG4gICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGVsOiBFbGVtZW50UmVmLCBwdWJsaWMgdGVybWluYWxTZXJ2aWNlOiBUZXJtaW5hbFNlcnZpY2UpIHtcbiAgICAgICAgdGhpcy5zdWJzY3JpcHRpb24gPSB0ZXJtaW5hbFNlcnZpY2UucmVzcG9uc2VIYW5kbGVyLnN1YnNjcmliZShyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbW1hbmRzW3RoaXMuY29tbWFuZHMubGVuZ3RoIC0gMV0ucmVzcG9uc2UgPSByZXNwb25zZTtcbiAgICAgICAgICAgIHRoaXMuY29tbWFuZFByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBuZ0FmdGVyVmlld0luaXQoKSB7XG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gRG9tSGFuZGxlci5maW5kKHRoaXMuZWwubmF0aXZlRWxlbWVudCwgJy51aS10ZXJtaW5hbCcpWzBdO1xuICAgIH1cbiAgICBcbiAgICBuZ0FmdGVyVmlld0NoZWNrZWQoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbW1hbmRQcm9jZXNzZWQpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLnNjcm9sbFRvcCA9IHRoaXMuY29udGFpbmVyLnNjcm9sbEhlaWdodDtcbiAgICAgICAgICAgIHRoaXMuY29tbWFuZFByb2Nlc3NlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICAgICAgICAgICAgIFxuICAgIEBJbnB1dCgpXG4gICAgc2V0IHJlc3BvbnNlKHZhbHVlOiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLmNvbW1hbmRzW3RoaXMuY29tbWFuZHMubGVuZ3RoIC0gMV0ucmVzcG9uc2UgPSB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMuY29tbWFuZFByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaGFuZGxlQ29tbWFuZChldmVudDogS2V5Ym9hcmRFdmVudCkge1xuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PSAxMykge1xuICAgICAgICAgICAgdGhpcy5jb21tYW5kcy5wdXNoKHt0ZXh0OiB0aGlzLmNvbW1hbmR9KTtcbiAgICAgICAgICAgIHRoaXMudGVybWluYWxTZXJ2aWNlLnNlbmRDb21tYW5kKHRoaXMuY29tbWFuZCk7XG4gICAgICAgICAgICB0aGlzLmNvbW1hbmQgPSAnJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBmb2N1cyhlbGVtZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBlbGVtZW50LmZvY3VzKCk7XG4gICAgfVxuICAgIFxuICAgIG5nT25EZXN0cm95KCkge1xuICAgICAgICBpZiAodGhpcy5zdWJzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG59XG5cbkBOZ01vZHVsZSh7XG4gICAgaW1wb3J0czogW0NvbW1vbk1vZHVsZSxGb3Jtc01vZHVsZV0sXG4gICAgZXhwb3J0czogW1Rlcm1pbmFsXSxcbiAgICBkZWNsYXJhdGlvbnM6IFtUZXJtaW5hbF1cbn0pXG5leHBvcnQgY2xhc3MgVGVybWluYWxNb2R1bGUgeyB9Il19